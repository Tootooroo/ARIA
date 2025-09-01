import { create } from 'zustand';

type AriaStore = {
  ariaTalking: boolean;
  setAriaTalking: (talking: boolean) => void;
};

export const useAriaStore = create<AriaStore>((set) => ({
  ariaTalking: false,
  setAriaTalking: (talking) => set({ ariaTalking: talking }),
}));
