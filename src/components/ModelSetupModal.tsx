import { Dialog } from './Dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfigure: () => void;
}

export function ModelSetupModal({ open, onClose, onConfigure }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="One quick setup step"
      description="Add a model key before you start."
      size="md"
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            I'll do it later
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              onConfigure();
              onClose();
            }}
          >
            Configure now
          </button>
        </>
      }
    >
      <p className="text-sm text-muted-fg text-pretty">
        This app runs on <strong>Gemma 3 27B</strong> through the Gemini API. Paste a
        key and you're ready. It stays in your browser and is never sent to a server.
      </p>

      <div className="card-soft p-3.5 space-y-2.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
          Get an API key
        </div>
        <ol className="list-decimal ml-5 space-y-1 text-sm text-fg/90">
          <li>
            Open{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-accent"
            >
              the key page
            </a>
            .
          </li>
          <li>Sign in and click <strong>Create API key</strong>.</li>
          <li>Paste the key into Settings and close the dialog.</li>
        </ol>
      </div>
    </Dialog>
  );
}
