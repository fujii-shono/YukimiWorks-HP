export function SectionIntro({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="page-intro">
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
      <hr />
    </div>
  );
}
