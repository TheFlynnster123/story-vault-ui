import { notifications } from "@mantine/notifications";

export interface IErrorService {
  log: (message: string, error?: any) => void;
}

export class ErrorService implements IErrorService {
  log = (message: string, error?: any) => {
    console.error(message, error);
    notifications.show({
      message: message,
      color: "red",
      autoClose: 5000,
      withCloseButton: true,
    });
  };
}
