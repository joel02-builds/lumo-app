import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';

export default function OnboardingScreen1({ onNext }) {
  return (
    <div className="screen">
      <div className="screen-content">
        <LumoMascot state="idle" label="Lumo" />
        <h1>Du lernst. Wir übernehmen den Rest.</h1>
        <Button onClick={onNext}>Loslegen</Button>
      </div>
    </div>
  );
}
