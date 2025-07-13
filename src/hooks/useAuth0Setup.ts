import { useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { setAuth0Context } from "../clients/AuthAPI";

export const useAuth0Setup = (): void => {
  const auth0Context = useAuth0();

  useEffect(() => {
    setAuth0Context(auth0Context);
  }, [auth0Context]);
};