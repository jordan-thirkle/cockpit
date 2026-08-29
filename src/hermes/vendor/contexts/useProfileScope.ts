// @ts-nocheck -- vendored verbatim from hermes-agent/web/src; not type-owned by Cockpit
import { useContext } from "react";
import { ProfileContext } from "@/hermes/vendor/contexts/profile-context";

export function useProfileScope() {
  return useContext(ProfileContext);
}
