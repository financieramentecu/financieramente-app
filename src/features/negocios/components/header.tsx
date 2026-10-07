import Image from 'next/image'

export function Header() {
	return (
		<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
			{/* Logo Financiera mente */}
			<div className="flex items-center gap-3">
				<Image
					src="/logos/logo-financiera.svg"
					alt="Financiera mente"
					width={140}
					height={35}
					className="h-auto w-auto"
				/>
			</div>

			{/* Banner con Isologo */}
			<div className="bg-primary w-full sm:w-auto px-4 sm:px-8 py-4 rounded-lg flex items-center gap-4 sm:gap-6">
				<div className="w-1/2 sm:w-auto flex items-center justify-center">
					<Image
						src="/logos/isologo.svg"
						alt="Isologo"
						width={120}
						height={120}
						className="w-full sm:w-24 sm:h-24 h-auto object-contain"
					/>
				</div>
				<div className="flex-1 flex flex-col">
					<h1 className="text-primary-foreground font-bold text-base sm:text-lg">
						Formulario único de inscripción de Negocios
					</h1>
				</div>
			</div>
		</div>
	)
}
