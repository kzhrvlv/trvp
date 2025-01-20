import Footer from "./components/Footer";
import Main from "./components/Main";
import Header from "./components/Header";
import { useState } from "react";

export default function App() {
	const [shown, setShown] = useState(false);
    const [shown2, setShown2] = useState(false);

	const visibleState = {shown, setShown, shown2, setShown2}

	return (
		<>
			<Header visibleState={visibleState}/>
			<Main visibleState={visibleState}/>
			<Footer />
		</>
	);
}
