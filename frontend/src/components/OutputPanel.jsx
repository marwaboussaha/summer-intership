const ACTION_LABELS = {
  create_page: "Nouvelle page",
  create_component: "Nouveau composant",
  add_feature: "Fonctionnalité ajoutée",
  unclear: "Commande incomprise",
};

export default function OutputPanel({ status, error, action }) {
  return (
    <div className="output">
      <span className="feed__label">SORTIE</span>

      {status === "idle" && !action && (
        <p className="output__hint">
          Le composant généré apparaîtra ici, avec son code prêt à copier dans
          ton projet React.
        </p>
      )}

      {status === "loading" && (
        <div className="output__loading">
          <span className="pulse-dot" />
          Groq compose ta page…
        </div>
      )}

      {status === "error" && (
        <div className="output__error">
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {status === "done" && action && (
        <div className="output__result">
          <div className="output__badge">
            {ACTION_LABELS[action.action] || action.action}
          </div>
          <h3 className="output__filename">{action.fileName || "—"}</h3>
          <p className="output__explanation">{action.explanation}</p>

          {action.code && (
            <pre className="output__code">
              <code>{action.code}</code>
            </pre>
          )}

          {action.code && (
            <button
              className="output__copy"
              onClick={() => navigator.clipboard.writeText(action.code)}
            >
              Copier le code
            </button>
          )}
        </div>
      )}
    </div>
  );
}
