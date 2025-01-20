import { TITLE } from "../constants";

export default function Header({visibleState}) {
    const {shown, setShown, shown2, setShown2} = visibleState;
    return (
        <header className="header-block">
            <div className="header-block-left-part">
                <img src="/images/favicon.png" alt="Logo" />
                <h1>{TITLE}</h1>
            </div>
            <div className="header-block-right-part">
                <div className="header-block-right-part-menu">
                    {!shown && (<button className="filed-button" onClick={() => {setShown(true); window.scrollTo(0,0);}}>Новая смена</button>)}
                    {!shown2 && (<button className="filed-button" onClick={() => {setShown2(true); window.scrollTo(0,0);}}>Новая процедура</button>)}
                </div>
                <img
                    src="/images/avatar.png"
                    className="header-block-right-part-avatar"
                    alt="header-block-right-part-avatar"
                />
                <span className="header-block-right-part-name">
                    Невролог
                </span>
            </div>
        </header>
    );
}
