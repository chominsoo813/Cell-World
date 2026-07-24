export function StatusBar() {
  return (
    <footer className="status-bar">
      <div>
        <span>Ready</span>
        <span className="sync-state">
          <i aria-hidden="true" /> Local save enabled
        </span>
      </div>
      <div>
        <span aria-hidden="true">▦ &nbsp; ▣ &nbsp; ▥</span>
        <span>−</span>
        <span className="zoom-track">
          <i />
        </span>
        <span>+</span>
        <span>100%</span>
      </div>
    </footer>
  );
}
