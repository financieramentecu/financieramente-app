import { FILE_TYPES, FileType } from '../../lib/file-types'
import type { ICommissionProcessor } from './processor.interface'
import { VoluntariaProcessor } from './voluntaria.processor'
import { PolizaProcessor } from './poliza.processor'

export class ProcessorFactory {
	private static voluntaria = new VoluntariaProcessor()
	private static poliza = new PolizaProcessor()

	static getProcessor(fileType: FileType): ICommissionProcessor {
		switch (fileType) {
			case FILE_TYPES.VOLUNTARIA:
				return this.voluntaria
			case FILE_TYPES.POLIZA:
				return this.poliza
			default:
				throw new Error(`Unsupported file type: ${fileType}`)
		}
	}
}
