// ====================================================================================================
//
// Cloud Code for GRANT_CURRENCY, write your code here to customise the GameSparks platform.
//
// For details of the GameSparks Cloud Code API see https://portal.gamesparks.net/docs.htm			
//
// ====================================================================================================

var newCash = Spark.getData().CASH;
Spark.getPlayer().credit1(newCash);
