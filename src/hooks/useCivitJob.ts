import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CivitJobAPI } from "../clients/CivitJobAPI";

const civitJobAPI = new CivitJobAPI();

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
};

async function fetchPhotoOrProcessJob(
  chatId: string,
  jobId: string,
  queryClient: ReturnType<typeof useQueryClient>
): Promise<string | null> {
  try {
    return await getStoredPhoto(chatId, jobId);
  } catch {
    return await pollJobStatus(chatId, jobId, queryClient);
  }
}

async function getStoredPhoto(chatId: string, jobId: string): Promise<string> {
  const photoData = await civitJobAPI.getPhoto(chatId, jobId);
  return (photoData as { base64: string }).base64;
}

async function pollJobStatus(
  chatId: string,
  jobId: string,
  queryClient: ReturnType<typeof useQueryClient>
): Promise<string | null> {
  const status = await civitJobAPI.getJobStatus(jobId);
  if (status.result?.length > 0 && status.result[0].available) {
    return await downloadAndSavePhoto(
      chatId,
      jobId,
      status.result[0].blobUrl,
      queryClient
    );
  }
  return null;
}

async function downloadAndSavePhoto(
  chatId: string,
  jobId: string,
  blobUrl: string,
  queryClient: ReturnType<typeof useQueryClient>
): Promise<string> {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  const base64 = await blobToBase64(blob);

  const photoDataToSave = { base64 };
  await civitJobAPI.savePhoto(chatId, jobId, photoDataToSave);

  queryClient.invalidateQueries({
    queryKey: ["civit-photo", chatId, jobId],
  });

  return base64;
}

export const useCivitJob = (chatId: string, jobId: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["civit-photo", chatId, jobId],
    queryFn: async () =>
      await fetchPhotoOrProcessJob(chatId, jobId, queryClient),
    enabled: !!chatId && !!jobId,
    refetchInterval: (query) => (query.state.data ? 0 : 8000),
  });
};
