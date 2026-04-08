import type { Action } from 'svelte/action';
import { tour } from '$lib/components/tour/tourLib.svelte';

export const tourTarget: Action<HTMLElement, string> = (node, id) => {
  if (!id) return;

  tour.register(id, node);

  return {
    destroy() {
      tour.unregister(id);
    }
  };
};