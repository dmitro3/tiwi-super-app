// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TiwiStakingPool
 * @notice TIWI Protocol Staking Pool Contract
 * 
 * Implements TIWI Protocol staking reward equations:
 * - Reward Rate = Pool Reward / (Total Staked Tokens * Time)
 * - User Reward = User Staked Amount * Reward Rate * Staking Time
 */
interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address a) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract TiwiStakingPool {
    IERC20Minimal public immutable stakingToken;   // Token users stake
    IERC20Minimal public immutable rewardToken;    // TWC or partner token reward

    uint256 public rewardPerSecond;                // Reward tokens emitted per second
    uint256 public lastRewardTime;                 // Last time pool was updated
    uint256 public accRewardPerShare;              // Accumulated rewards per share, scaled

    uint256 public totalStaked;                    // Total staked tokens
    uint256 public maxTvl;                         // Maximum TVL or Total Staked Tokens (set by admin)
    
    uint256 public poolReward;                     // Total reward tokens allocated to the pool
    uint256 public rewardDurationSeconds;          // Reward duration in seconds
    uint256 public startTime;                      // Pool start time
    uint256 public endTime;                        // Pool end time (startTime + rewardDurationSeconds)

    uint256 public constant ACC_PRECISION = 1e12;  // Precision for accumulated rewards

    address public owner;                          // Admin/owner who can configure rewards

    struct UserInfo {
        uint256 amount;        // Staked amount
        uint256 rewardDebt;    // amount * accRewardPerShare / ACC_PRECISION
        uint256 stakeTime;     // Time when user first staked
    }

    mapping(address => UserInfo) public userInfo;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Claim(address indexed user, uint256 amount);
    event SetRewardPerSecond(uint256 newRewardPerSecond);
    event SetMaxTvl(uint256 newMaxTvl);
    event SetPoolReward(uint256 poolReward, uint256 durationSeconds);
    event FundRewards(address indexed funder, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyActive() {
        require(block.timestamp >= startTime && block.timestamp <= endTime, "POOL_NOT_ACTIVE");
        _;
    }

    constructor(
        address _stakingToken,
        address _rewardToken,
        address _owner
    ) {
        require(_stakingToken != address(0) && _rewardToken != address(0), "ZERO_ADDR");
        stakingToken = IERC20Minimal(_stakingToken);
        rewardToken = IERC20Minimal(_rewardToken);
        owner = _owner;
        lastRewardTime = block.timestamp;
    }

    /**
     * @notice Set pool reward configuration (admin only)
     * @param _poolReward Total reward tokens allocated to the pool
     * @param _rewardDurationSeconds Reward duration in seconds
     * @param _maxTvl Maximum TVL or Total Staked Tokens
     */
    function setRewardConfig(
        uint256 _poolReward,
        uint256 _rewardDurationSeconds,
        uint256 _maxTvl
    ) external onlyOwner {
        require(_poolReward > 0, "INVALID_POOL_REWARD");
        require(_rewardDurationSeconds > 0, "INVALID_DURATION");
        require(_maxTvl > 0, "INVALID_MAX_TVL");

        _updatePool();

        poolReward = _poolReward;
        rewardDurationSeconds = _rewardDurationSeconds;
        maxTvl = _maxTvl;

        // Calculate reward per second: Pool Reward / Duration
        rewardPerSecond = _poolReward / _rewardDurationSeconds;

        // Set start and end times
        if (startTime == 0) {
            startTime = block.timestamp;
        }
        endTime = startTime + _rewardDurationSeconds;

        emit SetPoolReward(_poolReward, _rewardDurationSeconds);
        emit SetMaxTvl(_maxTvl);
        emit SetRewardPerSecond(rewardPerSecond);
    }

    /**
     * @notice Fund the pool with reward tokens (must be called after setRewardConfig)
     */
    function fundRewards() external onlyOwner {
        require(poolReward > 0, "REWARD_NOT_CONFIGURED");
        require(rewardToken.transferFrom(msg.sender, address(this), poolReward), "TRANSFER_FAIL");
        emit FundRewards(msg.sender, poolReward);
    }

    /**
     * @notice Calculate pending reward for a user
     * @param _user User address
     * @return Pending reward amount
     */
    function pendingReward(address _user) public view returns (uint256) {
        UserInfo memory u = userInfo[_user];
        uint256 _acc = accRewardPerShare;

        if (block.timestamp > lastRewardTime && totalStaked > 0 && rewardPerSecond > 0) {
            uint256 secondsElapsed = _getSecondsElapsed();
            uint256 reward = secondsElapsed * rewardPerSecond;
            _acc = _acc + (reward * ACC_PRECISION) / totalStaked;
        }

        uint256 accumulated = (u.amount * _acc) / ACC_PRECISION;
        if (accumulated < u.rewardDebt) return 0;
        return accumulated - u.rewardDebt;
    }

    /**
     * @notice Get seconds elapsed since last reward update (capped to end time)
     */
    function _getSecondsElapsed() internal view returns (uint256) {
        uint256 currentTime = block.timestamp;
        uint256 rewardEndTime = endTime;
        
        if (rewardEndTime == 0) return 0;
        if (currentTime > rewardEndTime) {
            currentTime = rewardEndTime;
        }
        if (currentTime <= lastRewardTime) return 0;
        
        return currentTime - lastRewardTime;
    }

    /**
     * @notice Deposit tokens into the staking pool
     * @param _amount Amount of tokens to stake
     */
    function deposit(uint256 _amount) external onlyActive {
        require(_amount > 0, "ZERO_AMOUNT");
        
        if (maxTvl > 0) {
            require(totalStaked + _amount <= maxTvl, "MAX_TVL_EXCEEDED");
        }
        
        _updatePool();

        UserInfo storage u = userInfo[msg.sender];

        // Pay pending rewards before updating stake amount
        uint256 pending = _pendingInternal(u);
        if (pending > 0) {
            _safeRewardTransfer(msg.sender, pending);
            emit Claim(msg.sender, pending);
        }

        // Pull staking tokens
        require(stakingToken.transferFrom(msg.sender, address(this), _amount), "TRANSFER_FAIL");

        // Set stake time if this is first deposit
        if (u.amount == 0) {
            u.stakeTime = block.timestamp;
        }

        u.amount += _amount;
        totalStaked += _amount;

        u.rewardDebt = (u.amount * accRewardPerShare) / ACC_PRECISION;

        emit Deposit(msg.sender, _amount);
    }

    /**
     * @notice Withdraw staked tokens
     * @param _amount Amount of tokens to withdraw
     */
    function withdraw(uint256 _amount) external {
        require(_amount > 0, "ZERO_AMOUNT");
        _updatePool();

        UserInfo storage u = userInfo[msg.sender];
        require(u.amount >= _amount, "INSUFFICIENT_STAKE");

        uint256 pending = _pendingInternal(u);
        if (pending > 0) {
            _safeRewardTransfer(msg.sender, pending);
            emit Claim(msg.sender, pending);
        }

        u.amount -= _amount;
        totalStaked -= _amount;

        u.rewardDebt = (u.amount * accRewardPerShare) / ACC_PRECISION;

        require(stakingToken.transfer(msg.sender, _amount), "TRANSFER_FAIL");
        emit Withdraw(msg.sender, _amount);
    }

    /**
     * @notice Claim pending rewards
     */
    function claim() external {
        _updatePool();

        UserInfo storage u = userInfo[msg.sender];
        uint256 pending = _pendingInternal(u);
        require(pending > 0, "NO_REWARD");

        _safeRewardTransfer(msg.sender, pending);
        emit Claim(msg.sender, pending);

        u.rewardDebt = (u.amount * accRewardPerShare) / ACC_PRECISION;
    }

    /**
     * @notice Update pool state (accumulate rewards)
     */
    function _updatePool() internal {
        if (block.timestamp <= lastRewardTime || totalStaked == 0 || rewardPerSecond == 0) {
            if (totalStaked == 0) {
                lastRewardTime = block.timestamp;
            }
            return;
        }

        uint256 secondsElapsed = _getSecondsElapsed();
        if (secondsElapsed == 0) return;

        uint256 reward = secondsElapsed * rewardPerSecond;
        accRewardPerShare = accRewardPerShare + (reward * ACC_PRECISION) / totalStaked;
        lastRewardTime = block.timestamp;
    }

    /**
     * @notice Calculate pending reward internally
     */
    function _pendingInternal(UserInfo storage u) internal view returns (uint256) {
        uint256 _acc = accRewardPerShare;

        if (block.timestamp > lastRewardTime && totalStaked > 0 && rewardPerSecond > 0) {
            uint256 secondsElapsed = _getSecondsElapsed();
            uint256 reward = secondsElapsed * rewardPerSecond;
            _acc = _acc + (reward * ACC_PRECISION) / totalStaked;
        }

        uint256 accumulated = (u.amount * _acc) / ACC_PRECISION;
        if (accumulated < u.rewardDebt) return 0;
        return accumulated - u.rewardDebt;
    }

    /**
     * @notice Safely transfer reward tokens (handles insufficient balance)
     */
    function _safeRewardTransfer(address _to, uint256 _amount) internal {
        uint256 bal = rewardToken.balanceOf(address(this));
        uint256 send = _amount > bal ? bal : _amount;
        if (send > 0) {
            require(rewardToken.transfer(_to, send), "REWARD_TRANSFER_FAIL");
        }
    }

    /**
     * @notice Get user staking info
     */
    function getUserInfo(address _user) external view returns (
        uint256 amount,
        uint256 rewardDebt,
        uint256 stakeTime,
        uint256 pending
    ) {
        UserInfo memory u = userInfo[_user];
        return (u.amount, u.rewardDebt, u.stakeTime, pendingReward(_user));
    }

    /**
     * @notice Emergency withdraw (admin only, for testing)
     */
    function emergencyWithdrawRewards(address _to) external onlyOwner {
        uint256 bal = rewardToken.balanceOf(address(this));
        require(rewardToken.transfer(_to, bal), "TRANSFER_FAIL");
    }
}
