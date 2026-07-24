const tabs = [
  "File",
  "Home",
  "Insert",
  "Page Layout",
  "Formulas",
  "Data",
  "Review",
  "View",
  "Help",
] as const;

const toolbarGroups = [
  {
    label: "Clipboard",
    tools: ["Paste", "Cut", "Copy"],
  },
  {
    label: "Font",
    tools: ["Pixeloid", "11", "B", "I", "U"],
  },
  {
    label: "Alignment",
    tools: ["≡", "≣", "⇤", "⇥", "Merge & Center"],
  },
  {
    label: "Number",
    tools: ["General", "$", "%", "0.00"],
  },
  {
    label: "Cells",
    tools: ["Insert", "Delete", "Format"],
  },
] as const;

export function Ribbon() {
  return (
    <div className="ribbon">
      <nav className="ribbon-tabs" aria-label="스프레드시트 메뉴">
        {tabs.map((tab) => (
          <button
            className={tab === "Home" ? "is-active" : undefined}
            key={tab}
            type="button"
          >
            {tab}
          </button>
        ))}
      </nav>
      <div className="ribbon-tools">
        {toolbarGroups.map((group) => (
          <div className="tool-group" key={group.label}>
            <div className="tool-items">
              {group.tools.map((tool) => (
                <button key={tool} type="button">
                  {tool}
                </button>
              ))}
            </div>
            <small>{group.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
