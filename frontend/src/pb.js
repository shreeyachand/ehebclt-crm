import PocketBase from 'pocketbase';

const pbUrl =
  import.meta.env.VITE_PB_URL ||
  (import.meta.env.DEV ? 'http://localhost:8090' : window.location.origin);

const pb = new PocketBase(pbUrl);

export default pb;
