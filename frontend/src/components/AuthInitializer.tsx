"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials, markHydrated, readPersistedAuth } from "@/features/auth/authSlice";

export function AuthInitializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const persisted = readPersistedAuth();
    if (persisted) {
      dispatch(setCredentials(persisted));
    } else {
      dispatch(markHydrated());
    }
  }, [dispatch]);

  return null;
}
