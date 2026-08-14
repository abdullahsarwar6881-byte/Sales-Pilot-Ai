"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

interface ProfileContextType {
  refreshProfile: number;
  reloadProfile: () => void;
}

const ProfileContext = createContext<ProfileContextType>({
  refreshProfile: 0,
  reloadProfile: () => {},
});

export function ProfileProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [refreshProfile, setRefreshProfile] = useState(0);

  function reloadProfile() {
    setRefreshProfile((prev) => prev + 1);
  }

  return (
    <ProfileContext.Provider
      value={{
        refreshProfile,
        reloadProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}