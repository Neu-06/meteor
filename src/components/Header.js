"use client";
import { useState } from "react";

const meteorites = [
	{ name: "Meteorito pequeño", value: "small" },
	{ name: "Asteroide mediano", value: "medium" },
	{ name: "Asteroide gigante", value: "large" },
];

export default function Header() {
	const [selected, setSelected] = useState(meteorites[0].value);

	return (
		<header className="bg-blue-900 dark:bg-blue-950 text-white px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between shadow gap-2">
			<h1 className="text-xl sm:text-2xl font-bold text-center">
				Simulador de Impactos
			</h1>
			<div className="flex items-center gap-2">
				<label className="font-semibold" htmlFor="meteorite-select">
					Tipo:
				</label>
				<select
					id="meteorite-select"
					className="text-black rounded px-2 py-1 focus:outline-none "
					value={selected}
					onChange={(e) => setSelected(e.target.value)}
				>
					{meteorites.map((m) => (
						<option key={m.value} value={m.value}>
							{m.name}
						</option>
					))}
				</select>
			</div>
		</header>
	);
}