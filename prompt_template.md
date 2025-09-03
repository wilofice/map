 Task: Generate Project Tasks XML
Your primary task is to provide a status update on our "VoiceFlow Project" project. 
You must analyze the project's current state, identify completed tasks, and outline the next steps. Cover technical, business, marketing, all aspects. 
Your entire response MUST be a single, well-formed XML document that strictly adheres to the schema defined below. This XML will be directly loaded into our mind map application.1. Strict XML Schema DefinitionThe XML document must follow this exact structure:Root Element: The single root element must be <project_plan>.Node Element: The fundamental building block is the <node> element.Nodes can be nested inside other nodes to create a hierarchical structure (parent-child relationships).Every <node> element MUST have the following four attributes:title="...": A descriptive string for the task, idea, or step.priority="...": The priority level. MUST be one of these three exact values: high, medium, or low.status="...": The completion status. MUST be one of these two exact values: pending or completed.id="...": A Universally Unique Identifier (UUID). You must generate a new, unique UUID for every single node.Comment Element (Optional):A <node> can contain an optional <comment> child element.The text inside the <comment> tag provides additional details or notes about its parent <node>.2. Example of a Valid XML StructureHere is a small, complete example of a perfectly formatted XML document. Use this as your guide.<?xml version="1.0" encoding="UTF-8"?>
<project_plan>
    <node 
        title="Finalize Core Features" 
        priority="high" 
        status="pending" 
        id="f47ac10b-58cc-4372-a567-0e02b2c3d479">
        
        <comment>This is the most critical phase before user testing can begin.</comment>
        
        <node 
            title="UI/UX Polish" 
            priority="medium" 
            status="pending" 
            id="986a1b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c">
            
            <node 
                title="Improve button hover effects" 
                priority="low" 
                status="completed" 
                id="c5e6f7a8-b9d0-1e2f-3a4b-5c6d7e8f9a0b"/>
        </node>
        
        <node 
            title="Bug Fixing" 
            priority="high" 
            status="pending" 
            id="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"/>
    </node>
</project_plan>
