const ZoomControls = ({ zoom, onZoomIn, onZoomOut, onReset }) => {
  // 1. bármelyik gomb megnyomódik, az felszól az App.jsx-nek és elküldi az értesítést mi lett megnyomva
  // ez lehet onZoomOut, onZoomIn vagy onReset
  return (
    <div className="zoom-controls">
      <button onClick={onZoomOut}> - </button>
      <span style={{ margin: "0 10px", fontFamily: "sans-serif" }}>
        {Math.round(zoom * 100)}%
      </span>
      <button onClick={onZoomIn}> + </button>
      <button onClick={onReset} style={{ marginLeft: "10px" }}>
        Reset
      </button>
    </div>
  );
};

export default ZoomControls;
