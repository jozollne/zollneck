export interface PockerEntry {
    id: number;
    buyIn: number;
    payOut: number;
    profit: number;
    allTimeProfit: number;
    dateJoin: string | null;
    timeSpend: number | null;
    allTimeTimeSpend: number | null;
    location: string | null;
    gamemode: string;
    fun: number;
    dateLeave: string | null;
}
