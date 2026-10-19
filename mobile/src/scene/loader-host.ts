/** GLTFLoader inspects this host metadata even for image-free GLBs. RN has a
 * navigator object without userAgent. Identify the actual native host, never a
 * pretend browser; existing browser metadata and all GPU capabilities stay intact.
 */
export function prepareLoaderHost(host: { readonly userAgent?: string; readonly product?: string }) {
  if (typeof host.userAgent === 'string') return;
  Object.defineProperty(host, 'userAgent', { value: host.product || 'ReactNative', configurable: true });
}
