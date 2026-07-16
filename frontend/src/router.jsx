import { useState } from "react";

export default function useRouter() {
  const [tab, setTab] = useState("units");
  return { tab, setTab };
}
