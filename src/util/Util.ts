const WEBID_POSTFIX = '/profile/card#me'


/**
 * Defines the type for a WebID, represented as a string.
 */
export type WebID = string;

/**
 * Extracts the path to the pod from a given resource URI.
 * @param resourceUri The URI of the resource.
 * @returns The base URL combined with the pod name.
 */
export function extractPathToPod(resourceUri: string): string {
  const url = new URL(resourceUri);
  const baseUrl = url.origin;
  const path = url.pathname;
  const pathSegments = path.split('/');
  const podName = pathSegments[1];
  return `${baseUrl}/${podName}`;
}

/**
 * Extracts the pod name from the root path to a pod.
 * @param rootPathToPod The root path to the pod.
 * @returns The name of the pod.
 */
export function extractPodName(rootPathToPod: string): string {
  const pathSegments = rootPathToPod.split('/');
  return pathSegments[pathSegments.length - 1];
}

/**
 * Extracts the WebID from a given resource URI.
 * @param resourceUri The URI of the resource.
 * @returns The WebID, constructed from the pod name and a predefined postfix.
 */
export function extractWebID(resourceUri: string): string {
  const podName = extractPathToPod(resourceUri);
  const WEBID_POSTFIX = "/profile/card#me"; // Replace with actual postfix if different
  return `${podName}${WEBID_POSTFIX}`;
}
