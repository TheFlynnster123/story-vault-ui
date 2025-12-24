import config from "../Config";
import { d } from "../app/Dependencies/Dependencies";
import type { ChatEvent } from "../cqrs/events/ChatEvent";

interface ChatEventDTO {
  id: string;
  content: string; // JSON-serialized, encrypted event
}

export class ChatEventStore {
  public URL: string;

  constructor() {
    this.URL = config.storyVaultAPIURL;
  }

  // ---- Public Chat Event Operations ----

  public async getChatEvents(chatId: string): Promise<ChatEvent[]> {
    const accessToken = await d.AuthAPI().getAccessToken();

    const response = await fetch(
      `${this.URL}/api/GetChatEvents`,
      buildGetChatEventsRequest(chatId, accessToken)
    );

    if (response.ok) {
      const chatResponse: ChatResponse = await response.json();
      return this.decryptEvents(chatResponse.events);
    } else {
      console.error("Failed to get chat events:", response.statusText);
      throw new Error(`Error fetching chat events: ${response.statusText}`);
    }
  }

  public async addChatEvent(
    chatId: string,
    event: ChatEvent
  ): Promise<boolean> {
    const accessToken = await d.AuthAPI().getAccessToken();
    const eventDTO = await this.encryptEvent(event);

    const response = await fetch(
      `${this.URL}/api/AddChatEvent`,
      buildAddChatEventRequest(chatId, eventDTO, accessToken)
    );

    if (response.ok) {
      return true;
    } else {
      console.error("Failed to add chat event:", response.statusText);
      return false;
    }
  }

  public async addChatEvents(
    chatId: string,
    events: ChatEvent[]
  ): Promise<boolean> {
    const accessToken = await d.AuthAPI().getAccessToken();
    const eventDTOs = await Promise.all(
      events.map((event) => this.encryptEvent(event))
    );

    const response = await fetch(
      `${this.URL}/api/AddChatEvents`,
      buildAddChatEventsRequest(chatId, eventDTOs, accessToken)
    );

    if (response.ok) {
      return true;
    } else {
      console.error("Failed to add chat events:", response.statusText);
      return false;
    }
  }

  // ---- Encryption / Decryption ----

  private async encryptEvent(event: ChatEvent): Promise<ChatEventDTO> {
    const eventJson = JSON.stringify(event);
    const encryptedContent = await d
      .EncryptionManager()
      .encryptString("chat", eventJson);

    return {
      id: this.generateEventId(),
      content: encryptedContent,
    };
  }

  async decryptEvents(dtos: ChatEventDTO[]): Promise<ChatEvent[]> {
    const events: ChatEvent[] = [];

    for (const dto of dtos) {
      try {
        const decryptedContent = await d
          .EncryptionManager()
          .decryptString("chat", dto.content);
        const event = JSON.parse(decryptedContent) as ChatEvent;
        events.push(event);
      } catch (error) {
        console.error("Failed to decrypt event:", error);
      }
    }

    return events;
  }

  generateEventId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);

    return `${timestamp}-${random}`;
  }
}

// ---- Request Builders ----
function buildGetChatEventsRequest(
  chatId: string,
  accessToken: string
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ chatId }),
  };
}

function buildAddChatEventRequest(
  chatId: string,
  eventDTO: ChatEventDTO,
  accessToken: string
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ chatId, event: eventDTO }),
  };
}

function buildAddChatEventsRequest(
  chatId: string,
  eventDTOs: ChatEventDTO[],
  accessToken: string
): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ chatId, events: eventDTOs }),
  };
}

// ---- Response Types ----
interface ChatResponse {
  events: ChatEventDTO[];
}
