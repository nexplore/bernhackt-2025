import { useState } from 'react'
import './App.css'
import { SampleForceGraph } from "./components/core/SampleForceGraph"
import Layout from './components/core/layout'


import { MsalAuthenticationTemplate, MsalProvider, useAccount, useMsal, useMsalAuthentication } from "@azure/msal-react";
import { type Configuration,  InteractionType,  type PopupRequest,  PublicClientApplication } from "@azure/msal-browser";
// MSAL configuration
const configuration: Configuration = {
    auth: {
        clientId: "c75c04fb-addf-4c62-8835-7860fed1d915",
        authority: "https://login.microsoftonline.com/90a976b0-6a3e-43d5-8389-31753457d82"
    }
};

const pca = new PublicClientApplication(configuration);

function App() {
     const authRequest: PopupRequest = {
        scopes: ['User.Read'] 
    };
  return (
    <>
    <MsalProvider instance={pca}> <MsalAuthenticationTemplate 
            interactionType={InteractionType.Redirect} 
            authenticationRequest={authRequest} 
            // errorComponent={ErrorComponent} 
            // loadingComponent={LoadingComponent}
        >
      <Layout>
        <SampleForceGraph />
      </Layout>

            <p>At least one account is signed in!</p>
        </MsalAuthenticationTemplate>
    </MsalProvider>
    </>
  )
}

export default App
