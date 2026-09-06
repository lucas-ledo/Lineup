export function WorkspaceSkeleton() {
  return <section className="workspace workspace--loading" aria-label="Cargando alineación" aria-busy="true">
    <section className="skeleton-panel skeleton-panel--pitch">
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--copy" />
      <div className="skeleton-pitch" aria-hidden="true">
        {Array.from({ length: 11 }, (_, index) => <i className={`skeleton-player skeleton-player--${index + 1}`} key={index} />)}
      </div>
    </section>
    <aside className="skeleton-panel skeleton-panel--squad">
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--copy" />
      {Array.from({ length: 6 }, (_, index) => <div className="skeleton-row" key={index}><i /><span /></div>)}
    </aside>
  </section>
}
