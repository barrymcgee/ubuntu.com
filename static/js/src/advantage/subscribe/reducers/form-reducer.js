import { createSlice } from "@reduxjs/toolkit";
import { loadState } from "../../../utils/persitState";

const isSmallVP =
  Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0) <
  875;

const productsArray = Object.entries(window.productList);

const initialFormState = {
  type: "physical",
  version: "18.04",
  feature: "infra",
  support: "unset",
  quantity: isSmallVP ? 0 : 1,
  billing: "yearly",
  product: {
    ok: false,
    supportPriceRange: {
      essential: null,
      standard: 52500,
      advanced: 127500,
    },
  },
  periods: [],
};

const prefixMap = {
  infra: "uai",
  apps: "uaa",
  "infra+apps": "uaia",
};

function getProductPeriods(productID) {
  const productPeriods = [];
  productsArray.forEach((product) => {
    if (product[1].productID === productID) {
      productPeriods.push(product[1].period);
    }
  });
  return productPeriods;
}

function matchingProduct(testItem, selectedProductID, selectedBillingPeriod) {
  if (
    testItem.productID === selectedProductID &&
    testItem.period === selectedBillingPeriod
  ) {
    return true;
  }
  return false;
}

function getProductByID(productID, billing) {
  var selectedProduct = initialFormState.product;
  productsArray.forEach((product) => {
    const listingProduct = product[1];
    listingProduct.id = product[0];
    if (matchingProduct(listingProduct, productID, billing)) {
      selectedProduct = {
        ...listingProduct,
        ok: true,
      };
      return;
    }
  });
  return selectedProduct;
}

function getDifferentSupportID(productID, newSupport) {
  return productID.replace(productID.split("-")[1], newSupport);
}

function getSupportPriceRange(productID) {
  const essentialID = getDifferentSupportID(productID, "essential");
  const standardID = getDifferentSupportID(productID, "standard");
  const advancedID = getDifferentSupportID(productID, "advanced");

  const essentialProduct = getProductByID(essentialID, "yearly");
  const standardProduct = getProductByID(standardID, "yearly");
  const advancedProduct = getProductByID(advancedID, "yearly");

  if (!essentialProduct.ok) {
    return {
      essential: null,
      standard: null,
      advanced: null,
    };
  }

  return {
    essential: essentialProduct.price.value,
    standard: standardProduct.ok
      ? standardProduct.price.value - essentialProduct.price.value
      : null,
    advanced: advancedProduct.ok
      ? advancedProduct.price.value - essentialProduct.price.value
      : null,
  };
}

function getProduct(state) {
  const prefix = prefixMap[state.feature];
  const suffix =
    state.feature === "apps" && state.type === "physical"
      ? ""
      : `-${state.type}`; //the suffix is always the type except for physical UA Apps
  const productID = `${prefix}-${state.support}${suffix}`;
  const product = getProductByID(productID, state.billing);
  return {
    ...product,
    supportPriceRange: getSupportPriceRange(productID, state.billing),
  };
}

const formSlice = createSlice({
  name: "form",
  initialState: loadState("ua-subscribe-state", "form", initialFormState),
  reducers: {
    changeType(state, action) {
      state.type = action.payload;
      if (action.payload === "desktop" && state.feature === "infra+apps") {
        state.feature = initialFormState.feature;
      }
      if (
        state.payload === "desktop" &&
        action.feature === "apps" &&
        state.support !== "essential"
      ) {
        state.support = "essential";
      }
      state.product = getProduct(state);
      state.periods = getProductPeriods(state.product.productID);
    },
    changeVersion(state, action) {
      state.version = action.payload;
    },
    changeFeature(state, action) {
      const urlParams = new URLSearchParams(window.location.search);
      const isAppsEnabled = urlParams.get("esm_apps") === "true";
      state.feature = isAppsEnabled ? action.payload : "infra"; //if ESM Apps is disabled we default to infra

      if (
        action.payload === "apps" &&
        state.type === "desktop" &&
        state.support !== "essential"
      ) {
        state.support = "essential";
      }

      if (action.payload !== "infra") {
        state.billing = "yearly";
      }
      state.product = getProduct(state);
      state.periods = getProductPeriods(state.product.productID);
    },
    changeSupport(state, action) {
      state.support = action.payload;
      if (action.payload !== "essential") {
        state.billing = "yearly";
      }
      state.product = getProduct(state);
      state.periods = getProductPeriods(state.product.productID);
    },
    changeQuantity(state, action) {
      if (action.payload >= 1) {
        state.quantity = action.payload;
      }
    },
    changeBilling(state, action) {
      state.billing = action.payload;
      state.product = getProduct(state);
      state.periods = getProductPeriods(state.product.productID);
    },
  },
});

// Extract the action creators object and the reducer
const { actions, reducer } = formSlice;

export const {
  changeType,
  changeVersion,
  changeFeature,
  changeSupport,
  changeQuantity,
  changeBilling,
} = actions;

export default reducer;
