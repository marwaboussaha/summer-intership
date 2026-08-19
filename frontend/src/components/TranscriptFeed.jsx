export default function TranscriptFeed({ entries }) {
  if (!entries.length) {
    return (
      <div className="feed feed--empty">
        <span className="feed__label">JOURNAL</span>
        <p>Aucune commande pour l'instant. Le journal se remplit à chaque phrase reconnue.</p>
      </div>
    );
  }

  return (
    <div className="feed">
      <span className="feed__label">JOURNAL</span>
      <ol className="feed__list">
        {entries.map((entry) => (
          <li key={entry.id} className="feed__item">
            <span className="feed__time">{entry.time}</span>
            <span className="feed__text">{entry.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
