import "./ui.css";

type Props = {
  title: string;
  subtitle?: string;
};

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <header className="ui-page-header">
      <h1 className="ui-page-header__title">{title}</h1>
      {subtitle ? <p className="ui-page-header__subtitle">{subtitle}</p> : null}
    </header>
  );
}
