import React, { useEffect, useState } from "react";

const CLIENT_ID = "6071773510053.8493658116935";
const REDIRECT_URI = "http://localhost:5000/api/auth/slack/callback";

const SlackAuth = () => {
    const [teamId, setTeamId] = useState(null);

    // Check for team_id in URL after successful OAuth
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const team_id = params.get("team_id");
        if (team_id) {
            setTeamId(team_id);
        }
    }, []);

    return (
        <div>
            <h1>Slack OAuth Example</h1>
            {teamId ? (
                <p>Successfully connected to Slack! Team ID: {teamId}</p>
            ) : (
                <a href={`https://slack.com/oauth/v2/authorize?client_id=${CLIENT_ID}&scope=chat:write,channels:read,channels:join&redirect_uri=${REDIRECT_URI}`}>
                    <img src="https://platform.slack-edge.com/img/add_to_slack.png" alt="Add to Slack" />
                </a>
            )}
        </div>
    );
};

export default SlackAuth;
