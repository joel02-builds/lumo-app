import LumoMascot from '../components/LumoMascot.jsx';

export default function AnalyzingScreen() {
  return (
    <div className="screen">
      <div className="screen-content">
        <LumoMascot state="learning" label="Lumo denkt nach" />
        <h1>Lumo schaut sich dein Material an …</h1>
        <p className="hint-text">Das dauert nur einen Moment.</p>
      </div>
    </div>
  );
}
