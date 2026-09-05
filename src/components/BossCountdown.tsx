import { isBossFloor } from '../game/rewards';
import Icon from './Icon';

export default function BossCountdown({ floor, nextBoss, defeated, fighting }: { floor: number; nextBoss: number; defeated: boolean; fighting: boolean }) {
  const step = defeated ? 3 : (floor - 1) % 3;
  const imminent = isBossFloor(floor) && !defeated;
  const label = defeated ? 'GUARDIAN DEFEATED' : fighting ? 'GUARDIAN ARENA' : imminent ? 'FIND THE BOSS PORTAL' : `${nextBoss - floor} FLOOR${nextBoss - floor !== 1 ? 'S' : ''} UNTIL BOSS`;
  return <div className={`boss-countdown ${imminent ? 'imminent' : ''} ${defeated ? 'defeated' : ''}`} aria-label={`${label}. Boss floor ${nextBoss}.`}>
    <div className="countdown-floor-meta"><span>FLOOR {String(floor).padStart(2, '0')}</span>{imminent && <span><Icon name="gate" size={9} />PORTAL</span>}</div>
    <div className="skull-countdown-track">{[0, 1, 2].map(index => <span key={index} className={`${index < step ? 'cleared' : ''} ${index === step && !defeated ? 'current' : ''}`} title={`Dungeon ${index + 1} of 3`}><Icon name="skull" size={20} /></span>)}<i /><span className="guardian-skull"><Icon name={defeated ? 'check' : 'skull'} size={31} /></span></div><span className="boss-countdown-label">{label}</span>
  </div>;
}