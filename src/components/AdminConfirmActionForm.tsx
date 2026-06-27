"use client";

type Props = {
  action: (formData: FormData) => Promise<void>;
  buttonLabel: string;
  confirmMessage: string;
  hiddenFields?: Record<string, string>;
  buttonClassName?: string;
};

const DEFAULT_BUTTON_CLASS =
  "rounded-md border border-amber-500/60 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-500/20";

export default function AdminConfirmActionForm({
  action,
  buttonLabel,
  confirmMessage,
  hiddenFields,
  buttonClassName = DEFAULT_BUTTON_CLASS,
}: Props) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      <button type="submit" className={buttonClassName}>
        {buttonLabel}
      </button>
    </form>
  );
}
