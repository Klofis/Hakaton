import "./LeftMenu.css";
import IconMenu1 from "../../assets/Svg/generationIcon.svg";
import IconMenu2 from "../../assets/Svg/communityIcon.svg";
const LeftMenu = () => {
  return (
    <div className="left-menu-main-block">
      <h1 className="left-menu-title">Hakaton</h1>

      <div className="left-menu-subblock">
        <h2 className="left-submenu-text">Основное</h2>

        <div className="left-menu-option-block">
          <img src={IconMenu1} className="option-icon"></img>
          <h2 className="left-menu-option-text">Кластеризация</h2>
        </div>

        <div className="left-menu-option-block">
          <img src={IconMenu2} className="option-icon"></img>
          <h2 className="left-menu-option-text">Галерея</h2>
        </div>
      </div>
    </div>
  );
};

export default LeftMenu;
