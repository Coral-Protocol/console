export type TourStep = {
	id: string;
	text: string;
	title: string;
	side?: 'top' | 'bottom' | 'left' | 'right';
};

export class TourState {
	targets = $state(new Map<string, HTMLElement>());
	steps = $state<TourStep[]>([]);
	stepIndex = $state(0);

	register(id: string, el: HTMLElement) {
		this.targets.set(id, el);
	}

	unregister(id: string) {
		this.targets.delete(id);
	}

	get currentStep() {
		return this.steps[this.stepIndex];
	}

	get currentTarget(): HTMLElement | undefined {
		const id = this.currentStep?.id;
		return id ? this.targets.get(id) : undefined;
	}

	next() {
		if (this.stepIndex < this.steps.length - 1) {
			this.stepIndex++;
		}
	}

	prev() {
		if (this.stepIndex > 0) {
			this.stepIndex--;
		}
	}

	start(steps: TourStep[]) {
		this.steps = steps;
		this.stepIndex = 0;
	}

	end() {
		this.steps = [];
		this.stepIndex = 0;
	}
}

export const tour = new TourState();
