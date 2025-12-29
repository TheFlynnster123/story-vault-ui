import { useAuth0 } from "@auth0/auth0-react";
import { setAuth0Context } from "../../services/Auth/AuthAPI";

export const useAuth0Setup = (): void => {
  const auth0Context = useAuth0();

  setAuth0Context(auth0Context);
};
