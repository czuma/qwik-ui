import {
  $,
  QRL,
  QwikIntrinsicElements,
  QwikMouseEvent,
  Signal,
  Slot,
  component$,
  useSignal,
  useStyles$,
  useTask$,
} from '@builder.io/qwik';
import {
  WidthElement as WidthState,
  activateFocusTrap,
  adjustScrollbar,
  closing,
  deactivateFocusTrap,
  lockScroll,
  overrideNativeDialogEscapeBehaviorWith,
  showModal,
  trapFocus,
  unlockScroll,
  wasModalBackdropClicked,
} from './modal-behavior';

import styles from './modal.css?inline';

export type ModalProps = Omit<QwikIntrinsicElements['dialog'], 'open'> & {
  onShow$?: QRL<() => void>;
  onClose$?: QRL<() => void>;
  'bind:show'?: Signal<boolean>;
  closeOnBackdropClick?: boolean;
  alert?: boolean;
};

export const Modal = component$((props: ModalProps) => {
  useStyles$(styles);
  const modalRefSig = useSignal<HTMLDialogElement>();
  const scrollbarWidthState: WidthState = { width: null };

  const { 'bind:show': givenOpenSig } = props;

  const defaultShowSig = useSignal(false);
  const showSig = givenOpenSig || defaultShowSig;

  const closeOnBackdropClickSig = useSignal(true);

  useTask$(async function bindCloseOnBackdropClick({ track }) {
    const closeOnBackdropClick = track(() => props.closeOnBackdropClick);

    if (closeOnBackdropClick === undefined || closeOnBackdropClick === true) {
      closeOnBackdropClickSig.value = true;
    } else {
      closeOnBackdropClickSig.value = false;
    }
  });

  useTask$(async function toggleModal({ track, cleanup }) {
    const isOpen = track(() => showSig.value);
    const modal = modalRefSig.value;

    if (!modal) return;

    const focusTrap = trapFocus(modal);

    const escapeKeydownHandler = overrideNativeDialogEscapeBehaviorWith(
      () => (showSig.value = false),
    );

    window.addEventListener('keydown', escapeKeydownHandler);

    if (isOpen) {
      showModal(modal, props.onShow$);
      adjustScrollbar(scrollbarWidthState, modal);
      activateFocusTrap(focusTrap);
      lockScroll();
    } else {
      unlockScroll(scrollbarWidthState);
      closing(modal, props.onClose$);
    }

    cleanup(() => {
      deactivateFocusTrap(focusTrap);

      // prevents closing animation scrollbar flickers (chrome & edge)
      if (scrollbarWidthState.width) {
        const currLeft = parseInt(modal.style.left);
        modal.style.left = `${scrollbarWidthState.width - currLeft}px`;
      }

      window.removeEventListener('keydown', escapeKeydownHandler);
    });
  });

  const closeOnBackdropClick$ = $((event: QwikMouseEvent) => {
    if (props.alert === true || props.closeOnBackdropClick === false) {
      return;
    }

    if (wasModalBackdropClicked(modalRefSig.value, event)) {
      showSig.value = false;
    }
  });

  return (
    <dialog
      role={props.alert === true ? 'alertdialog' : 'dialog'}
      {...props}
      ref={modalRefSig}
      onClick$={(event) => closeOnBackdropClick$(event)}
    >
      <Slot />
    </dialog>
  );
});
