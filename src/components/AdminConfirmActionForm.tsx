"use client";

type Props = {
  action: () => Promise<void>;
  buttonLabel: string;
  confirmMessage: string;
};

export default function AdminConfirmActionForm({ action, buttonLabel, confirmMessage }: Props) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/20"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
