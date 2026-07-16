import Slider from "../common/Slider";
import Button from "../common/Button";
import { useTrade } from "../../hooks/useTrade";
import { useTrainingStore } from "../../store/trainingStore";

export default function TradePanel() {
  const { doBuy, doSell, position } = useTrade();
  const buyPercentage = useTrainingStore((s) => s.buyPercentage);
  const sellPercentage = useTrainingStore((s) => s.sellPercentage);
  const setBuyPercentage = useTrainingStore((s) => s.setBuyPercentage);
  const setSellPercentage = useTrainingStore((s) => s.setSellPercentage);

  const hasPosition = position > 0.001;

  return (
    <div className="trade-panel">
      <div className="trade-panel__side">
        <Button variant="bull" onClick={() => doBuy()} disabled={position >= 1}>
          ▲ 買入
        </Button>
        <div className="trade-panel__slider">
          <Slider
            value={buyPercentage}
            min={1}
            max={100}
            step={1}
            onChange={setBuyPercentage}
            label="買入比例"
          />
        </div>
      </div>

      <div className="trade-panel__side">
        <Button variant="bear" onClick={() => doSell()} disabled={!hasPosition}>
          ▼ 賣出
        </Button>
        <div className="trade-panel__slider">
          <Slider
            value={sellPercentage}
            min={1}
            max={100}
            step={1}
            onChange={setSellPercentage}
            label="賣出比例"
          />
        </div>
      </div>
    </div>
  );
}
