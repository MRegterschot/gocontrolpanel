import { RegistrationRules } from "@/lib/tourney-manager";
import { Infer } from "spacetimedb";

interface RegistrationProps {
  registrationRules: Infer<typeof RegistrationRules>;
}

export default function Registration({ registrationRules }: RegistrationProps) {
  if (registrationRules.tag === "Open") {
    return <p>Registration is open to all participants.</p>;
  } else if (registrationRules.tag === "Inherit") {
    return <p>Registration rules are inherited from the parent competition.</p>;
  } else if (registrationRules.tag === "Players") {
    return (
      <div>
        <p>
          Registration is limited to {registrationRules.value.playerLimit}{" "}
          players.
        </p>
      </div>
    );
  } else if (registrationRules.tag === "Team") {
    return (
      <div>
        <p>
          Registration is limited to {registrationRules.value.teamLimit} teams.
        </p>
        <div>
          <strong>Team Sizes:</strong>
          <ul>
            <li>Minimum: {registrationRules.value.teamSizeMin}</li>
            <li>Maximum: {registrationRules.value.teamSizeMax}</li>
          </ul>
        </div>
      </div>
    );
  } else {
    return <p>Unknown registration rules.</p>;
  }
}
