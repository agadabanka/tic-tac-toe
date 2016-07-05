// ====================================================================================================
//
// Cloud Code for SAVE_PLAYER, write your code here to customise the GameSparks platform.
//
// For details of the GameSparks Cloud Code API see https://portal.gamesparks.net/docs.htm			
//
// ====================================================================================================



var playerDataList = Spark.runtimeCollection("playerData"); // this will get the collection of player data
var playerID = Spark.getPlayer().getPlayerId(); // first we get the id of the current player
var playerExperiance = Spark.getData().XP; // we get the xp input from Unity
var playerGold = Spark.getData().GOLD; // Get the gold input from Unity
var playerPos = Spark.getData().POS; // and the position input from Unity
var currentPlayer = {
	"playerID": playerID,
	"playerXP": playerExperiance,
	"playerGold": playerGold,
	"playerPos": playerPos
}; // we construct a new player from the data we are about to input into the player data

var player = playerDataList.find({"playerID" : playerID})

playerDataList.update({
	"playerID": playerID
}, //Looks for a doc with the id of the current player
{
	"$set": currentPlayer
}, // Uses the $set mongo modifier to set old player data to the current player data
true, // Create the document if it does not exist (upsert)
false // This query will only affect a single object (multi)
);
