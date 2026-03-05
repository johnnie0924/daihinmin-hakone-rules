import { useEffect } from 'react'

type SetBoolean = (value: boolean | ((prev: boolean) => boolean)) => void

export function useAutoCollapsePeerSection(
  isFullyConnected: boolean,
  isPeerSectionCollapsed: boolean,
  setIsPeerSectionCollapsed: SetBoolean,
) {
  useEffect(() => {
    if (isFullyConnected && isPeerSectionCollapsed === false) {
      setIsPeerSectionCollapsed(true)
    }
  }, [isFullyConnected, isPeerSectionCollapsed, setIsPeerSectionCollapsed])
}

