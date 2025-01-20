import { TITLE } from "../constants";

export default function Footer() {
    const currentYear = new Date().getFullYear();
    return <footer className="footer-block">ТРВП-015. РК6-71Б - Журавлева Екатерина. ©{currentYear} - {TITLE}. Все права защищены.</footer>;
}
