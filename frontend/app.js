//track every click
document.addEventListener("click", (e) => {
	console.log("Click detected:", e.clientX, e.clientY, e.target.id);

	fetch("http://localhost:4000/event", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			uid,
			type: "click",
			metadata: {
				x: e.clientX,
				y: e.clientY,
				target: e.target.id,
			},
		}),
	});
});

function trackHover(element, answerText) {
	let start;

	element.addEventListener("mouseenter", () => {
		start = performance.now();
	});

	element.addEventListener("mouseleave", () => {
		const duration = performance.now() - start;

		fetch("http://localhost:4000/event", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				uid,
				type: "hover",
				metadata: { answerText, duration },
			}),
		});
	});
}
