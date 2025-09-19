// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract SocialScoreChain {
    struct Profile {
        uint256 score;
        uint256 upvotes;
        uint256 downvotes;
        bool exists;
    }

    mapping(address => Profile) public profiles;
    mapping(address => mapping(address => bool)) public voted; // voter => subject => voted?

    event ProfileCreated(address indexed user);
    event ScoreUpdated(address indexed user, int256 delta, uint256 newScore);

    modifier profileExists(address user) {
        require(profiles[user].exists, "Profile does not exist");
        _;
    }

    function createProfile() external {
        require(!profiles[msg.sender].exists, "Profile already exists");
        profiles[msg.sender] = Profile(1000, 0, 0, true); // Initial base score
        emit ProfileCreated(msg.sender);
    }

    function vote(address user, bool isUpvote) external profileExists(user) {
        require(user != msg.sender, "Cannot vote for yourself");
        require(!voted[msg.sender][user], "Already voted");

        voted[msg.sender][user] = true;

        if (isUpvote) {
            profiles[user].score += 10;
            profiles[user].upvotes += 1;
            emit ScoreUpdated(user, 10, profiles[user].score);
        } else {
            if (profiles[user].score >= 10) {
                profiles[user].score -= 10;
                emit ScoreUpdated(user, -10, profiles[user].score);
            }
            profiles[user].downvotes += 1;
        }
    }

    function getScore(address user) external view profileExists(user) returns (uint256) {
        return profiles[user].score;
    }
}
