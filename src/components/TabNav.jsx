const TABS = [
  ["board", "Board"],
  ["cases", "Cases"],
  ["requests", "Requests"],
];

export default function TabNav({ activeTab, onSelect }) {
  return (
    <nav className="tab-nav" aria-label="Parts views">
      {TABS.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={activeTab === key ? "tab-button active" : "tab-button"}
          onClick={() => onSelect(key)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
