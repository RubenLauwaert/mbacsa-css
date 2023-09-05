const WEBID_POSTFIX = '/profile/card#me'

export function extractPathToPod(resourceUri:string):string{
  const url = new URL(resourceUri);
  const baseUrl = url.origin;
  const path = url.pathname;
  const pathSegments = path.split('/');
  const podName = pathSegments[1];
  return baseUrl + '/' + podName;
}

export function extractWebID(resourceUri:string):string{
  const podName = extractPathToPod(resourceUri);
  return podName + WEBID_POSTFIX;
}