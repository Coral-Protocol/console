import type { Template } from "./TemplateV1";
import { bundledTemplates } from "$lib/bundled-templates";

export const TEMPLATE_NAME_REGEX = /^[a-zA-Z0-9_-]{1,32}$/;

export const fetchBundledTemplates = (): Template[] => bundledTemplates;


export const normalizeTemplate = (raw: Template | unknown): Template => {
    if (!raw || typeof raw !== 'object') {
        raw = {} as Template;
    }

    const template = raw as Partial<Template>;

    return {
        ...template,
        name: typeof template.name === 'string'
            ? template.name
            : `imported_${Date.now()}`,
        trusted: Boolean(template.trusted),
        version: 1,
        payload:
            typeof template.payload === 'object' &&
            template.payload !== null
                ? template.payload
                : {
                    version: 1,
                    data: ''
                },
        updated: typeof template.updated === 'number'
            ? template.updated
            : Date.now()
    };
};

  /**
   * Returns the raw JSON string stored in the template's payload, which is expected to be the session data.
   */
export const getSessionDataFromTemplateName = (template: string) => {
    const raw = localStorage.getItem(`template_${template}`);
    if (!raw) {
        throw new Error('Template not found');
    }
    const data = JSON.parse(raw);
    if (!data?.payload?.data) {
        throw new Error('Template has no session data');
    }

    return data.payload.data as string;
}

export const saveTemplateToLocalStorage = (template: Template) => {
	if (!template.name.trim()) {
		return { success: false, error: 'Template name cannot be empty.' };
	}

	if (!TEMPLATE_NAME_REGEX.test(template.name)) {
		return {
			success: false,
			error:
				'Template name must be 1-32 characters and contain only letters, numbers, "-" or "_".'
		};
	}

	if (!template.payload.data) {
		return { success: false, error: 'No template data to save.' };
	}

	try {
		const existing = localStorage.getItem(`template_${template.name}`);
		const overwrite = !!existing;

		localStorage.setItem(
			`template_${template.name}`,
			JSON.stringify(template)
		);

		const templateIndex = JSON.parse(
			localStorage.getItem('template_index') || '[]'
		);

		const updatedIndex = [...new Set([...templateIndex, template.name])];

		localStorage.setItem('template_index', JSON.stringify(updatedIndex));

		return { success: true, overwrite };
	} catch (error) {
		return { success: false, error: 'Failed to save template.' + (error instanceof Error ? ` ${error.message}` : '') };
	}
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeJSONParse(value: string | null, fallback: any = {}) {
	try {
		if (!value) return fallback;
		return JSON.parse(value);
	} catch {
		return fallback;
	}
}

export const refreshTemplateFromStorage = (
	name?: string
): {
	templateData?: Template;
	templates: string[];
} => {
	if (name) {
		const raw = localStorage.getItem(`template_${name}`);
		const parsed = normalizeTemplate(
			safeJSONParse(raw, {})
		);

		const currentTemplates = fetchTemplatesFromStorage();

		const updatedTemplates = currentTemplates
			.filter((t) => t !== name)
			.concat(name);

		return {
			templateData: parsed,
			templates: updatedTemplates
		};
	}

	return {
		templates: fetchTemplatesFromStorage()
	};
};



export const fetchTemplatesFromStorage = (): string[] => {
	try {
		const rawIndex = localStorage.getItem('template_index');
		const parsed = safeJSONParse(rawIndex, []);

		if (!Array.isArray(parsed)) {
			localStorage.setItem('template_index', JSON.stringify([]));
			return [];
		}

		const validTemplates: string[] = [];

		for (const name of parsed) {
			if (typeof name !== 'string') continue;

			const raw = localStorage.getItem(`template_${name}`);
			if (!raw) continue;

			const parsedTemplate = safeJSONParse(raw, null);
			if (!parsedTemplate) continue;

			validTemplates.push(name);
		}

		localStorage.setItem(
			'template_index',
			JSON.stringify(validTemplates)
		);

		return validTemplates;
	} catch {
		localStorage.setItem('template_index', JSON.stringify([]));
		return [];
	}
};


export const pickAndParseTemplateFile = async (): Promise<
	| { success: true; data: Template }
	| { success: false; error: string }
> => {
	return new Promise((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'application/json';

		input.onchange = async () => {
			if (!input.files?.[0]) {
				resolve({ success: false, error: 'No file selected.' });
				return;
			}

			try {
				const text = await input.files[0].text();
				const parsed = safeJSONParse(text, null);

				if (!parsed) {
					resolve({ success: false, error: 'Invalid JSON file.' });
					return;
				}

				const data = normalizeTemplate(parsed);

				resolve({ success: true, data });
			} catch {
				resolve({ success: false, error: 'Could not read file.' });
			}
		};

		input.click();
	});
};

export const checkTemplateOverwrite = (
	name: string
): boolean => {
	return !!localStorage.getItem(`template_${name}`);
};


export const downloadTemplate = (templateName: string) => {
		try {
			const data = localStorage.getItem(`template_${templateName}`);
			if (!data) {
				throw new Error('Template data not found');
			}
			const blob = new Blob([data], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `coral-template-${templateName}.json`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Error downloading template:', error);
		}
	};
